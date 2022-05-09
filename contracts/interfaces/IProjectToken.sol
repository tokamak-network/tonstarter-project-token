// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IProjectToken {

    /// @notice Shows the owner of the token ID.
    /// @param tokenId tokenId
    /// @return an owner address
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Shows the name
    /// @return name
    function name() external view returns (string memory);

    /// @notice Shows the symbol
    /// @return symbol
    function symbol() external view returns (string memory);

    /// @notice shows the asset data of the token ID.
    /// @param tokenId tokenId
    /// @return the asset data
    function tokenURI(uint256 tokenId) external view returns (string memory);

    /// @notice Returns the data inputed when creating a token ID.
    /// @param tokenId tokenId
    /// @return the data inputed
    function tokenURIValue(uint256 tokenId) external view returns (string memory);

    /// @notice shows the total supply
    /// @return the total supply
    function totalSupply() external view returns (uint256);

    /// @notice List of all token IDs owned by the owner
    /// @param owner_ owner address
    /// @return all token IDs
    function tokensOfOwner(address owner_) external view returns (uint256[] memory);

    /// @notice mint
    /// @param tokenURI_ asset data
    function mint(string calldata tokenURI_) external;
}
